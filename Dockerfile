# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts
COPY angular.json tsconfig*.json tailwind.config.js postcss.config.js ./
COPY build-plugins ./build-plugins
COPY src/main/webapp ./src/main/webapp
ENV NG_BUILD_MAX_WORKERS=2
RUN npm run webapp:build:prod

FROM --platform=$BUILDPLATFORM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /build
COPY . .
COPY --from=frontend /build/target/classes/static/ ./target/classes/static/
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp -Pprod -DskipTests -Dskip.installnodenpm -Dskip.npm package \
    && cp target/baara-boloda-*.jar /tmp/application.jar

FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app
RUN groupadd --gid 10001 baaraboloda \
    && useradd --uid 10001 --gid 10001 --no-create-home baaraboloda \
    && mkdir -p /app/.data \
    && chown 10001:10001 /app/.data
COPY --from=backend /tmp/application.jar /app/application.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/application.jar"]
