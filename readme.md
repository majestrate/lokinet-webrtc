# lokinet webrtc demo

running:

    $ git submodule update --init --recursive
    $ CMAKE_BUILD_PARALLEL_LEVEL=$(nproc) npm install
    $ npm start

making an appimage:

    $ npm run dist:linux
     
making an exe:

    $ npm run dist:win32


## development


format code:

    $ npm run format
