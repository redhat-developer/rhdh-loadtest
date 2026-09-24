CHART_NAME = rhdh-loadtests-next
NAMESPACE = rhdh-loadtests-next

# Optional: CLUSTER_ROUTER_BASE=$(oc get ingresses.config.openshift.io cluster -o jsonpath='{.spec.domain}')
install:
	helm upgrade --install $(CHART_NAME) . \
		--create-namespace \
		--namespace $(NAMESPACE) \
		--values values.yaml \
		$(if $(CLUSTER_ROUTER_BASE),--set redhat-developer-hub.openshift.clusterRouterBase=$(CLUSTER_ROUTER_BASE),)

delete:
	helm uninstall $(CHART_NAME) --namespace $(NAMESPACE)

# OCI package is named "chart"; Chart.yaml uses alias redhat-developer-hub for values.
update-dependencies:
	helm dependency update
