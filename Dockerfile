FROM node:18-alpine

ARG N8N_VERSION

RUN if [ -z "$N8N_VERSION" ] ; then echo "The N8N_VERSION argument is missing!" ; exit 1; fi

# Update everything and install needed dependencies
RUN apk add --update graphicsmagick tzdata git tini su-exec

# Set a custom user to not have n8n run as root
USER root

# Install n8n and the packages it needs to build it correctly.
RUN apk --update add --virtual build-dependencies python3 build-base ca-certificates && \
    export PYTHON="$(which python3)"  && \
    npm_config_user=root npm install -g full-icu n8n@${N8N_VERSION} && \
    apk del build-dependencies \
    && rm -rf /root /tmp/* /var/cache/apk/* && mkdir /root;

# APPROACH 2
# RUN apk --update add --virtual build-dependencies python3 build-base ca-certificates && \
#     npm_config_user=root npm install --python="$(which python3)" -g full-icu n8n@${N8N_VERSION} && \
#     apk del build-dependencies \
#     && rm -rf /root /tmp/* /var/cache/apk/* && mkdir /root;


# Install fonts
RUN apk --no-cache add --virtual fonts msttcorefonts-installer fontconfig && \
    update-ms-fonts && \
    fc-cache -f && \
    apk del fonts && \
    find  /usr/share/fonts/truetype/msttcorefonts/ -type l -exec unlink {} \; \
    && rm -rf /root /tmp/* /var/cache/apk/* && mkdir /root

ENV NODE_ICU_DATA /usr/local/lib/node_modules/full-icu

WORKDIR /data

COPY docker-entrypoint.sh /docker-entrypoint.sh

COPY . .
RUN npm i && \
    npm run build && \
    mv dist/ /root/.n8n/custom  && \
    mkdir -p /root/.n8n/custom

RUN  cd  /root/.n8n/custom/ && \
    npm link

RUN ["chmod", "+x", "/docker-entrypoint.sh"]
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

EXPOSE 5678/tcp