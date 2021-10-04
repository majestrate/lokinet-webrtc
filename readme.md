# lokinet webrtc demo

running:

    $ git submodule update --init --recursive
    $ CMAKE_BUILD_PARALLEL_LEVEL=$(nproc) npm install
    $ npm start

packaging:

    $ npm run dist
     
making an exe:

    $ npm run win32


## development


format code:

    $ npm run format
