

build:
	CMAKE_BUILD_PARALLEL_LEVEL=$(shell nproc) npm install
	CMAKE_BUILD_PARALLEL_LEVEL=$(shell nproc) npm run dist

clean:
	rm -rf node_modules
	rm -rf release
