

build:
	BUILD_TARGET=linux CMAKE_BUILD_PARALLEL_LEVEL=$(shell nproc) npm install
	BUILD_TARGET=linux CMAKE_BUILD_PARALLEL_LEVEL=$(shell nproc) npm run dist

clean:
	rm -f icon.png
	rm -rf node_modules
	rm -rf build
	$(MAKE) -C external clean
