install-all:
	cd helm/rhdh-110 && make install
	cd helm/rhdh-110-nfs && make install
	cd helm/rhdh-next && make install

install-legacy:
	cd helm/rhdh-18 && make install
	cd helm/rhdh-19 && make install
	
update-dependencies:
	cd helm/rhdh-18 && make update-dependencies
	cd helm/rhdh-19 && make update-dependencies
	cd helm/rhdh-110 && make update-dependencies
	cd helm/rhdh-110-nfs && make update-dependencies
	cd helm/rhdh-next && make update-dependencies
