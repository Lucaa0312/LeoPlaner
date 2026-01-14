FROM maven:3.9.12-eclipse-temurin-21

WORKDIR /workspace

# Copy pom.xml and download dependencies to speed up future starts
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy the rest of the code
COPY src ./src

EXPOSE 8080
# 5005 is for the debugger, 8080 for the app
EXPOSE 5005

# Run Quarkus in Dev Mode, allowing remote connections
CMD ["mvn", "quarkus:dev", "-Dquarkus.http.host=0.0.0.0", "-Ddebug=false"]