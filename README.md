# WilsontheWolf's Repo
To view the repo go [here](https://wilsonthewolf.github.io/repo/)!

# Building
To build the repo you need either;
1. [A linux machine with apt (debian/ubuntu) (wsl works too)](#building-natively)
2. [A system with docker on it](#building-with-docker)

## Building natively
On a system with apt you need the following;
`nodejs`, `git`, `apt-utils`

On these systems you can get node via [nodesource](https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions). Node LTS (v16.x as of writing) is recommended.

You can install `git` and `apt-utils` using the following:
```sh
sudo apt update 
sudo apt install git apt-utils
```
Now clone the repo
```sh
git clone https://github.com/WilsontheWolf/repo
cd repo
```

Next install dependencies
```sh
npm i # or yarn
```

Now you can run `npm run build` or `yarn build` to build the project.

Afterwords continue onto [Setup the Repo](#setup-the-repo).

# Building with docker
To build with docker first make sure `docker` and `git` is installed.
First clone the repo 
```sh
git clone https://github.com/WilsontheWolf/repo
cd repo
```
Afterwords all you have to do is run `./docker-build` to build.
This will handle all your dependencies and build the project for you.

Afterwords continue onto [Setup the Repo](#setup-the-repo).

# Setup the Repo
There is a file called `config.json`.
This file has config values to modify your repo with.

Here is an example.
```json
{
    "name": "My Cool Repo",
    "base": "/",
    "url": "https://example.com/",
    "desc": "My repo."
}
```

The name is what shows up on your home page and in the package manager.

The base is the url where your files start, ending with a `/`. If you wanted to make your repo at https://example.com/repo your url is `/repo/`.

The url is the full url to your repo. This is used for package manager links and depiction URL's ending with a `/`.

The desc is used for metadata for your repo.

# Adding and Modifying Packages
To add/update packages first add the debian file to the `debs` folder.

Doing this automatically adds the deb to the repo on next build. However, this won't add data for the depictions. It will try to infer as much as it can from the package to make an ok depiction.

To add data to the depictions, make a folder with the name of the package id in the `info` folder.

Then make a file in that folder named `info.json`. 

From here we can add values. Here is what a fully populated info looks like. 
```json
{
    "name": "My Tweak",
    "tagline": "My cool tweak!",
    "desc": "This is my cool tweak. Its pretty cool!",
    "screenshots": [
        {
            "name": "image.png",
            "accessibilityText": "Describe the image."
        }
    ],
    "changelog": [
        {
            "version": "0.0.2",
            "changes": "- The tweak is now 101% cooler."
        },
        {
            "version": "0.0.1",
            "changes": "- Initial Release"
        }
    ]
}
```

Please note that every field is optional and will attempt to either infer a value, use a placeholder value or not display at all.

The changelog should always have the newest version on top to prevent issues.

Images need to be placed in a folder called `screenshots` in the folder with the info. 

The description and changes in the changelog support markdown.

After this is all setup you can rebuild your repo. It will be built with all your new packages.