# lokinet webrtc demo

CI builds [here](https://oxen.rocks/majestrate/lokinet-webrtc/master/?C=M&O=D)

## development

running:

    $ git submodule update --init --recursive
    $ CMAKE_BUILD_PARALLEL_LEVEL=$(nproc) npm install
    $ npm start

making an appimage:

    $ npm run dist:linux
     
making an exe:

    $ npm run dist:win32

format code:

    $ npm run format
