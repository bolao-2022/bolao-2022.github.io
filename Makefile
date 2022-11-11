help:
	@echo "uso: make [ build | run | clean | deploy-test | deploy-gcloud ]"

build: $(wildcard app/**)
	mkdir -p build
	cp -r app/* build/
	touch build

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

deploy-test: build
	rsync -arv --delete --delete-excluded build/  dsc:public_html/fb/

deploy-gcloud: build
	gcloud app deploy build/app.yaml --project bolao-2022 -q -v dev
