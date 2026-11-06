FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --no-create-home g7
COPY --from=build /app/target/academia-1.0.0.jar app.jar
USER g7
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
