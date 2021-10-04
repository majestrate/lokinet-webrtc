local docker_base = 'registry.oxen.rocks/lokinet-ci-';

local submodules = {
    name: 'submodules',
    image: 'drone/git',
    commands: ['git fetch --tags', 'git submodule update --init --recursive --depth=1']
};

// local apt_get_quiet = 'apt-get -o=Dpkg::Use-Pty=0 -q';


local nodejs_builder(name, image, npm_target, arch='amd64', extra_cmds=[], cc='gcc', cxx='g++', extra_deps='') = {
  kind: 'pipeline',
  type: 'docker',
  name: 'electron ('+name+')',
  platform: { arch: arch },
  steps: [
    submodules,
    {
      name: 'build',
      image: image,
      environment: { SSH_KEY: { from_secret: "SSH_KEY" }, WINEDEBUG: "0", CC: cc, CXX: cxx },
      commands : [
        apt_get_quiet+ ' install libsodium-dev '+extra_deps , // for headers
        'npm install',
        'npm run '+npm_target
      ] + extra_cmds
    }
  ]
};

[
  nodejs_builder('Linux', docker_base+'nodejs', 'dist', extra_cmds=['./contrib/ci/upload-artifcats.sh']),
  nodejs_builder('Win32', docker_base+'nodejs', 'win32', extra_cmds=['./contrib/ci/upload-artifcats.sh'], cc='x86_64-w64-mingw32-gcc-posix', cxx='x86_64-w64-mingw32-g++-posix', extra_deps='mingw-w64')
]
