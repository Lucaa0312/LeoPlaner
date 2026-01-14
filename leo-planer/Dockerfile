# ---------- build stage ----------
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

# copy wrapper + pom first (better caching)
COPY mvnw mvnw.cmd pom.xml ./
COPY .mvn .mvn
RUN ./mvnw -B dependency:go-offline

# copy source and build
COPY src src
RUN ./mvnw -B package -DskipTests

# ---------- runtime stage ----------
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
