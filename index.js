const fs = require('fs/promises');
const path = require('path');
const config = require('./config.json');
const exec = require('util').promisify(require('child_process').exec);
const parser = require('./controlParser');
const Kennel = require('@zenithdevs/kennel');

const processFiles = async (dir, to) => {
    const files = await fs.readdir(dir);
    // TODO : Promise.all
    for (const file of files) {
        const stat = await fs.stat(path.join(dir, file));
        if (stat.isFile()) {
            let data = await fs.readFile(path.join(dir, file));
            if (file.endsWith('.html'))
                data = data.toString()
                    .replace(/%(\w+)%/g, (orig, value) =>
                        config[value] ?? orig
                    );
            await fs.writeFile(path.join(to, file), data);
        } else {
            await fs.mkdir(path.join(to, file));
            await processFiles(path.join(dir, file), path.join(to, file));
        }
    }
};

(async () => {

    console.log('Building site.');

    // Clearing Folders
    await fs.rmdir('./build', {recursive: true}).catch(() => {});
    await fs.mkdir('./build');

    await fs.rmdir('./buildPackages', {recursive: true}).catch(() => {});
    await fs.mkdir('./buildPackages');

    // Processing Files
    await processFiles('./pages', './build');

    console.log('Processing debs.');

    await exec('./scripts/processPackages.sh');

    console.log('Processing package data.');

    let packages = parser((await fs.readFile('./buildPackages/Packages')).toString(), { multi: true });

    const packageFile = packages.reduce((output, package) => {
        
        output.push(`Filename ${package.get('Filename').replace(/^\.\.\/debs\/(.+)$/, './debs/$1')}
Depiction ${config.url}depictions/web/${package.get('Package')}
SileoDepiction ${config.url}depictions/sileo/${package.get('Package')}`);
        package.forEach((v, k) => {
            output.push(`${k}: ${v}\n`);
        });
        return output;
    }, []).join('\n');

    await fs.writeFile('./build/Packages', packageFile);
    console.log('Making repo data.');
    await fs.writeFile('./buildPackages/repo.conf', `APT {
FTPArchive {
Release {
Origin "${config.name}";
Label "${config.name}";
Suite stable;
Version 1.0;
Codename idk;
Architectures iphoneos-arm;
Components main;
Description "${config.desc}";
};
};
};
`);
    await exec('./scripts/genRepo.sh');
    await fs.rmdir('./buildPackages', {
        recursive: true
    });
    console.log('Copying debs');
    await fs.mkdir('./build/debs');
    await processFiles('./debs', './build/debs');
    console.log('Generating sileo depictions.');
    let sDepictions = new Map();
    
    for (let p of packages) {
        if (sDepictions.has(p.get('Package'))) continue;
        let tweak;
        try {
            tweak = JSON.parse(await fs.readFile(`./info/${p.get('Package')}/info.json`));
        } catch (e) {
            tweak = {
                name: p.get('Name') || p.get('Package'),
                desc: p.get('Description'),
            };
        }
        sDepictions.set(p.get('Package'), {d: {
            'minVersion': '0.1',
            'tabs': [
                {
                    'tabname': 'Details',
                    'views': [
                        {
                            'class': 'DepictionHeaderView',
                            'title': tweak.name
                        },
                        tweak.tagline ? {
                            'class': 'DepictionSubheaderView',
                            'title': tweak.tagline
                        } : null,
                        {
                            'class': 'DepictionSeparatorView'
                        },
                        {
                            'class': 'DepictionHeaderView',
                            'title': 'Description:'
                        },
                        {
                            'class': 'DepictionMarkdownView',
                            'markdown': tweak.desc || 'No description available.'
                        },
                        tweak.screenshots?.length ? {
                            'class': 'DepictionScreenshotsView',
                            'screenshots': tweak.screenshots.map(s => ({
                                url: `${config.url}depictions/screenshots/${p.get('Package')}/${s.name}`,
                                accessibilityText: s.accessibilityText,
                                video: s.video ?? false
                            })),
                            'itemCornerRadius': 6,
                            'itemSize': '{160, 275.41333333333336}'
                        } : null,
                        (tweak.changelog?.length ? [{
                            'class': 'DepictionHeaderView',
                            'title': 'Whats new?'
                        },
                        {
                            'class': 'DepictionSubheaderView',
                            'title': `v${tweak.changelog[0].version}`
                        },
                        {
                            'class': 'DepictionMarkdownView',
                            'markdown': tweak.changelog[0].changes || 'No changes reported.'
                        }] : [])
                    ].flat().filter(v => v),
                    'class': 'DepictionStackView'
                },
                {
                    'tabname': 'Changelog',
                    'views': [
                        {
                            'class': 'DepictionHeaderView',
                            'title': `${tweak.name} Changelog`
                        },
                        ...(tweak.changelog?.length ? tweak.changelog.map(c => [{
                            'class': 'DepictionHeaderView',
                            'title': `v${c.version}`
                        },
                        {
                            'class': 'DepictionMarkdownView',
                            'markdown': c.changes || 'No changes reported.'
                        }]) : [{
                            'class': 'DepictionSubheaderView',
                            'title': 'No changes found.'
                        },])
                    ].flat().filter(v => v),
                    'class': 'DepictionStackView'
                }
            ],
            'class': 'DepictionTabView'
        }, info: tweak});
    }
    console.log('Saving depictions.');
    await fs.mkdir('./build/depictions/sileo');
    await fs.mkdir('./build/depictions/screenshots');
    for (let [id, {d, info}] of sDepictions) {
        await fs.writeFile(`./build/depictions/sileo/${id}`, JSON.stringify(d));
        if (info.screenshots?.length) {
            await fs.mkdir(`./build/depictions/screenshots/${id}`);
            await processFiles(`./info/${id}/screenshots`, `./build/depictions/screenshots/${id}`);
        }
        const res = new Kennel(d).render();
        await fs.writeFile(`./build/depictions/web/${id}.html`, `<html lang="en">
    <head>
        <meta charset="utf8">
        <link rel="stylesheet" type="text/css" href="${config.base}styles/kennel.css">
        <title>${info.name}</title>
        <link rel="icon" href="${config.base}CydiaIcon.png" type="image/png">
        <meta property="og:title" content="${info.name}" />
        <meta property="og:site_name" content="${config.name}" />
        <meta property="og:description" content="${info.tagline || info.desc || 'A cool tweak.'}" />
        <meta property="og:image" content="${config.base}CydiaIcon.png" />
        <meta name="theme-color" content="#6264d3">
        <style>@media (prefers-color-scheme: dark) {html {background: #121212; color: white;}} body {margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;}</style>
    </head>
    <body>${res}</body>
    <script>
        function ndChangeTab(show, hide) {
            let i;
            // Hide elements.
            for (i = 0; i < document.querySelectorAll(\`\${hide}.nd_tab\`).length; i++) {
                document.querySelectorAll(\`\${hide}.nd_tab\`)[i].classList.add("nd_hidden");
                document.querySelectorAll(\`\${hide}.nd_nav_btn\`)[i].classList.remove("nd_active");
            }
            // Show elements.
            for (i = 0; i < document.querySelectorAll(\`\${show}.nd_tab\`).length; i++) {
                document.querySelectorAll(\`\${show}.nd_tab\`)[i].classList.remove("nd_hidden");
                document.querySelectorAll(\`\${show}.nd_nav_btn\`)[i].classList.add("nd_active");
            }
        }
</script>
</html>`);  
    }
    await fs.writeFile('./build/styles/kennel.css', await fs.readFile(require.resolve('@zenithdevs/kennel/dist/kennel.css')));
})();
