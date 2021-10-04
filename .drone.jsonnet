local docker_base = 'registry.oxen.rocks/lokinet-ci-';

local submodules = {
    name: 'submodules',
    image: 'drone/git',
    commands: ['git fetch --tags', 'git submodule update --init --recursive --depth=1']
};

local apt_get_quiet = 'apt-get -o=Dpkg::Use-Pty=0 -q -y';


local nodejs_builder(name, image, build_env, arch='amd64', extra_cmds=[], extra_deps='', before_npm=[]) = {
  kind: 'pipeline',
  type: 'docker',
  name: 'electron ('+name+')',
  platform: { arch: arch },
  steps: [
    submodules,
    {
      name: 'build',
      image: image,
      environment: { SSH_KEY: { from_secret: "SSH_KEY" }, WINEDEBUG: "0", BUILD_TARGET: build_env, CMAKE_BUILD_PARALLEL_LEVEL: '4', WINEPREFIX: '$CCACHE_DIR/wine' },
      commands : [
        apt_get_quiet+ ' update',
        apt_get_quiet+ ' upgrade',
        apt_get_quiet+ ' install libsodium-dev '+extra_deps // for headers
      ] + before_npm + [
        "npm config set cache $CCACHE_DIR/npm --global",
        'npm install',
        'npm run dist'
      ] + extra_cmds
    }
  ]
};

[
  nodejs_builder('Linux', docker_base+'nodejs', 'linux', extra_cmds=['./contrib/ci/upload-artifacts.sh']),
  nodejs_builder('Win32', docker_base+'nodejs', 'win32', extra_cmds=['./contrib/ci/upload-artifacts.sh'], extra_deps='mingw-w64', before_npm=['update-alternatives --set x86_64-w64-mingw32-gcc /usr/bin/x86_64-w64-mingw32-gcc-posix','update-alternatives --set x86_64-w64-mingw32-g++ /usr/bin/x86_64-w64-mingw32-g++-posix'])
]
