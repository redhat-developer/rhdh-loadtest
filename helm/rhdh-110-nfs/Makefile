CHART_NAME = rhdh-loadtest-110-nfs
NAMESPACE = rhdh-loadtest-110-nfs

install:
	helm upgrade --install $(CHART_NAME) . --create-namespace --namespace $(NAMESPACE) --values values.yaml

delete:
	helm uninstall $(CHART_NAME) --namespace $(NAMESPACE)

update-dependencies:
	sed -i 's/name: redhat-developer-hub/name: chart/g' Chart.yaml Chart.lock
	helm dependency update
	sed -i 's/name: chart/name: redhat-developer-hub/g' Chart.yaml Chart.lock
