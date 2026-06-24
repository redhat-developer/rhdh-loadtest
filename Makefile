install-all:
	cd helm/rhdh-17 && make install
	cd helm/rhdh-18 && make install
	cd helm/rhdh-19 && make install
	cd helm/rhdh-110 && make install
	cd helm/rhdh-next && make install

update-dependencies:
	cd helm/rhdh-17 && make update-dependencies
	cd helm/rhdh-18 && make update-dependencies
	cd helm/rhdh-19 && make update-dependencies
	cd helm/rhdh-110 && make update-dependencies
	cd helm/rhdh-next && make update-dependencies
