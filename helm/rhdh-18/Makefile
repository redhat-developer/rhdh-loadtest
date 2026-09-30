CHART_NAME = rhdh-loadtest-18
NAMESPACE = rhdh-loadtest-18

install:
	helm upgrade --install $(CHART_NAME) . --create-namespace --namespace $(NAMESPACE) --values values.yaml

delete:
	helm uninstall $(CHART_NAME) --namespace $(NAMESPACE)

update-dependencies:
	helm dependency update
