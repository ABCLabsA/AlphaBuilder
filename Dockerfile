FROM postgres:16-alpine

ENV POSTGRES_DB=alpha-builder-db \
    POSTGRES_USER=postgres \
    POSTGRES_PASSWORD=postgres

EXPOSE 5432

CMD ["postgres"]
