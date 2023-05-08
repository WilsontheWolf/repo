const fs = require('fs/promises');
const path = require('path');
const config = require('./config.json');
const exec = require('util').promisify(require('child_process').exec);
const parser = require('control-parser');
const Kennel = require('@zenithdevs/kennel');

const processFiles = async (dir, to) => {
    const files = await fs.readdir(dir);
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

let noWarnings = true;
const warn = (msg) => {
    console.warn(`[!] ${msg}`);
    noWarnings = false;
};

const preflight = () => {
    if (!config) throw new Error('No config file found.');
    if (!config.name) warn('No name specified in config.json. This might cause issues.');
    if (!config.desc) warn('No description specified in config.json. This might cause issues.');

    if (!config.url) warn('No url specified in config.json. This might cause issues.');
    else {
        try {
            const url = new URL(config.url);
            if (!url.host) warn('Invalid url specified in config.json. This might cause issues.');
            if (url.protocol !== 'https:' && url.protocol !== 'http:') warn('Invalid url protocol specified in config.json. This might cause issues.');
        } catch (e) {
            warn('Invalid url specified in config.json. This might cause issues.');
        }
    }
    if (!config.base) warn('No base specified in config.json. This might cause issues.');
    else {
        if (!config.base.endsWith('/')) {
            warn('Base specified in config.json does not end with "/". This might cause issues.');
        }
    }
};

const setup = async () => {
    // Clearing Folders
    await fs.rm('./build', { recursive: true }).catch(() => { });
    await fs.mkdir('./build');

    await fs.rm('./buildPackages', { recursive: true }).catch(() => { });
    await fs.mkdir('./buildPackages');

    await fs.mkdir('./build/debs');

    // Processing Files
    await processFiles('./pages', './build');

    await fs.mkdir('./build/depictions/sileo');
    await fs.mkdir('./build/depictions/screenshots');
    await fs.mkdir('./build/icons');

    await exec('./scripts/processPackages.sh');
};

let sDepictions = new Set();
const processPackageFiles = async (output, package) => {
    output = await output;

    package.set('Filename', package.get('Filename').replace(/^\.\.\/debs\/(.+)$/, './debs/$1'));
    package.set('Depiction', `${config.url}depictions/web/${package.get('Package')}`);
    package.set('SileoDepiction', `${config.url}depictions/sileo/${package.get('Package')}`);
    if (await fs.stat(`./info/${package.get('Package')}/icon.png`).catch(() => false)) {
        await fs.copyFile(`./info/${package.get('Package')}/icon.png`, `./build/icons/${package.get('Package')}.png`);
        package.set('Icon', `${config.url}icons/${package.get('Package')}.png`);
    }
    package.forEach((v, k) => {
        output.push(`${k}: ${v}`);
    });
    // Ensures proper formatting 
    output.push('');

    if (!sDepictions.has(package.get('Package'))) {
        let tweak;
        try {
            tweak = JSON.parse(await fs.readFile(`./info/${package.get('Package')}/info.json`));
            if (!tweak.name) tweak.name = package.get('Name') || package.get('Package');
            if (!tweak.desc) tweak.desc = package.get('Description');

        } catch (e) {
            warn(`Could not load info.json for "${package.get('Name') || package.get('Package')}". Inferring from package data.`);
            tweak = {
                name: package.get('Name') || package.get('Package'),
                desc: package.get('Description'),
            };
        }

        const id = package.get('Package');
        const d = makeSileoDepiction(tweak, id);

        await fs.writeFile(`./build/depictions/sileo/${id}`, JSON.stringify(d));
        if (tweak.screenshots?.length) {
            await fs.mkdir(`./build/depictions/screenshots/${id}`);
            await processFiles(`./info/${id}/screenshots`, `./build/depictions/screenshots/${id}`);
        }
        const res = new Kennel(d).render();
        await fs.writeFile(`./build/depictions/web/${id}.html`, makeHTMLDepiction(tweak, res));

        sDepictions.add(package.get('Package'));
    }

    return output;
};

(async () => {
    preflight();

    await setup();

    let packages = parser((await fs.readFile('./buildPackages/Packages')).toString(), { multi: true });

    console.log(`Found ${packages.length} packages.`);

    // The reverse is to cause the latest version of each package to be processed first.
    const packageFile = (await packages.reverse().reduce(processPackageFiles, [])).join('\n');

    await fs.writeFile('./build/Packages', packageFile);
    await fs.writeFile('./buildPackages/repo.conf', makeRepoConf());
    await exec('./scripts/genRepo.sh');
    await fs.rm('./buildPackages', {
        recursive: true
    });
    await processFiles('./debs', './build/debs');

    await fs.writeFile('./build/styles/kennel.css', await fs.readFile(require.resolve('@zenithdevs/kennel/dist/kennel.css')));

    if (noWarnings) {
        console.log('Done successfully.');
    } else {
        warn('Done with warnings. Consider fixing them.');
    }
})();

const makeRepoConf = () => `APT {
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
`;

const makeSileoDepiction = (tweak, package) => ({
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
                tweak.banner?.text ? {
                    'class': 'DepictionLabelView',
                    'text': tweak.banner.text,
                    'textColor': tweak.banner.color,
                    'fontWeight': 'bold',
                    'alignment': 1,
                    'fontSize': 18,
                } : null,
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
                        url: `${config.url}depictions/screenshots/${package}/${s.name}`,
                        accessibilityText: s.accessibilityText,
                        video: s.video ?? false
                    })),
                    'itemCornerRadius': 6,
                    'itemSize': '{160, 275.41333333333336}'
                } : null,
                tweak.links?.filter(l => l.url && l.name)?.length ? [{
                    'class': 'DepictionHeaderView',
                    'title': 'Links:'
                }, ...tweak.links.filter(l => l.url && l.name).map(l => ({
                    class: 'DepictionTableButtonView',
                    title: l.name,
                    action: l.url
                }))] : null,
                (tweak.changelog?.length ? [{
                    'class': 'DepictionHeaderView',
                    'title': 'Whats new?'
                },
                {
                    'class': 'DepictionSubheaderView',
                    'title': `v${tweak.changelog[0].version}${tweak.changelog[0].date ? ` - ${tweak.changelog[0].date}` : ''}`
                },
                {
                    'class': 'DepictionMarkdownView',
                    'markdown': tweak.changelog[0].changes || 'No changes reported.'
                }] : []),
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
                    'title': `v${c.version}${c.date ? ` - ${c.date}` : ''}`
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
});

const makeHTMLDepiction = (info, res) => `<html lang="en">
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
</html>`;
