local docker_base = 'registry.oxen.rocks/lokinet-ci-';

local submodules = {
    name: 'submodules',
    image: 'drone/git',
    commands: ['git fetch --tags', 'git submodule update --init --recursive --depth=1']
};

local apt_get_quiet = 'apt-get -o=Dpkg::Use-Pty=0 -q';


local nodejs_builder(name, image, npm_target, arch='amd64', extra_cmds=[]) = {
  kind: 'pipeline',
  type: 'docker',
  name: 'electron ('+name+')',
  platform: { arch: ardh },
  steps: [
    submodules,
    {
      name: 'build',
      image: image,
      environment: { SSH_KEY: { from_secret: "SSH_KEY" } },
      commands : [
        'npm install',
        'npm run '+npm_target
      ]
    }
  ]
}

[
  nodejs_builder('Linux', docker_base+'nodejs', 'dist'),
  nodejs_builder('Win32', docker_base+'nodejs', 'win32')
]
