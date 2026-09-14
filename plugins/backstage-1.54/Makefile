regenerate: cleanup generate

# Remove all backstage files and folders except `.git` and `Makefile`
cleanup:
	rm -rf \
		.docker* \
		.eslint* \
		.gitignore \
		.prettier* \
		.yarn* \
		app-config* \
		backstage* \
		catalog* \
		dist-types \
		examples \
		node_modules \
		package.json \
		packages \
		playwright* \
		plugins \
		README.md \
		tsconfig* \
		yarn*

# Expect only `.git` and `Makefile` in the current folder.
check:
	@if [ `ls -1A | wc -l` -ne 2 ]; then \
		echo "Error: There should be exactly 2 files in the directory."; \
		exit 1; \
	fi

# Create a new backstage app
generate: check
	BACKSTAGE_APP_NAME=backstage npx -y @backstage/create-app@latest --path .

