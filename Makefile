help:
	@echo "uso: make [ run | build | test-deploy | deploy ]"

build: index.html js
	mkdir -p build
	cp index.html build/
	cp js/* build/
	cp -r assets build/

run: build
	npx live-server --host=0.0.0.0 --port=12345 --no-browser

clean:
	@echo "apagando recursivamente: *.py[cod]"
	find . -type f -name "*.pyc" -exec rm '{}' +
	find . -type d -name "__pycache__" -exec rmdir '{}' +
	find . -type d -name ".pytest_cache" -exec rmdir '{}' +
	rm -rf dist build venv *.egg-info .coverage

test: venv
	$(PIP) install --requirement requirements-test.txt
	$(PYTEST)

test-deploy: build
	rsync -arv --delete --delete-excluded build/  dsc:public_html/fb/

deploy: build
	gcloud app deploy build/app.yaml --project bolao-2022 -q -v dev
