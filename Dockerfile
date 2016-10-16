FROM alpine:3.4
RUN apk --no-cache add nodejs
RUN mkdir -p /opt/node\
 && addgroup -g 1000 node\
 && adduser -h /home/node -u 1000 -G node -D -s /bin/false node\
 && chown -R node:node /opt/node
USER node
RUN cd /opt/node && npm install xml2js argparse
ADD server.js /opt/node/
ENTRYPOINT ["node", "/opt/node/server.js"]
