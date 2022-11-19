ifdef v
	VERSAO := $(v)
else
	VERSAO := dev
endif

help:
	@echo "uso: make [ build | run | clean | deploy-test | deploy-gcloud ]"

build: $(wildcard app/**)
	mkdir -p build
	cp -r app/* build/
	cd build; \
	for a in $$(find . -type f | grep -v 'checksum.*txt'); do \
      sha1sum $$a | tee -a checksums.txt ; \
    done | sha1sum - | cut -f 1 -d ' ' | tee checksum.txt; \
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

deploy-github: build
	rm -rf bolao-2022.github.io
	git clone http://github.com/bolao-2022/bolao-2022.github.io
	cp -r build/* bolao-2022.github.io/
	cd bolao-2022.github.io; \
    git add .; \
    git commit -m "versao ${VERSAO}"; \
    git push; \
