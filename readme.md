# lokinet webrtc demo

CI builds [here](https://oxen.rocks/majestrate/lokinet-webrtc/master/?C=M&O=D)

## development

initial setup:

    $ git clone --recursive https://github.com/majestrate/lokinet-webrtc/ 
    $ cd lokinet-webrtc
    
updating source:
    
    $ git pull
    $ git submodule update --init --recursive

running from source:

    $ rm -rf node_modules
    $ CMAKE_BUILD_PARALLEL_LEVEL=$(nproc) npm install
    $ npm start

making an appimage:

    $ rm -rf node_modules
    $ export BUILD_TARGET=linux
    $ npm run dist
     
making an exe:

    $ rm -rf node_modules
    $ export BUILD_TARGET=win32
    $ CMAKE_BUILD_PARALLEL_LEVEL=$(nproc) npm install
    $ npm run dist

format code:

    $ npm run format
