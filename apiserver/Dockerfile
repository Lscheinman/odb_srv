FROM python:3.7
MAINTAINER Lynn Scheinman <lscheinman77@gmail.com>

RUN apt-get update && apt-get install -qq -y \
  build-essential libpq-dev --no-install-recommends

RUN apt-get install default-jre -y
RUN apt-get install default-jdk -y

ENV INSTALL_PATH /apiserver
RUN mkdir -p $INSTALL_PATH

WORKDIR $INSTALL_PATH

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY . .

CMD gunicorn -b 0.0.0.0:5000 --access-logfile --workers=1 --timeout=240 - "apiserver.app:create_app()"