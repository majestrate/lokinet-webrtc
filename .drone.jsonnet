local docker_base = 'registry.oxen.rocks/lokinet-ci-';
local image = docker_base + 'nodejs';

local submodules = {
    name: 'submodules',
    image: 'drone/git',
    commands: ['git fetch --tags', 'git submodule update --init --recursive --depth=1']
};

local apt_get_quiet = 'apt-get -o=Dpkg::Use-Pty=0 -q -y';


local nodejs_builder(build_env, arch='amd64', extra_cmds=[], before_npm=[]) = {
  kind: 'pipeline',
  type: 'docker',
  name: 'electron ('+build_env+')',
  platform: { arch: arch },
  steps: [
    submodules,
    {
      name: 'build',
      image: image,
      environment: { SSH_KEY: { from_secret: "SSH_KEY" }, WINEDEBUG: "0", BUILD_TARGET: build_env, CMAKE_BUILD_PARALLEL_LEVEL: '4', UPLOAD_OS: build_env },
      commands : [
        apt_get_quiet+ ' update',
        apt_get_quiet+ ' upgrade',
      ] + before_npm + [
        "npm config set cache $CCACHE_DIR/npm --global",
        'npm install',
        'npm run dist'
      ] + extra_cmds
    }
  ]
};

[
  nodejs_builder('linux', extra_cmds=['./contrib/ci/upload-artifacts.sh']),
  nodejs_builder('win32', extra_cmds=['./contrib/ci/upload-artifacts.sh'])
]
