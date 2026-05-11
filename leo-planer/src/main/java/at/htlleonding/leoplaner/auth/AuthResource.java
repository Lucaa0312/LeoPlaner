package at.htlleonding.leoplaner.auth;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/auth")
public class AuthResource {

    @Inject
    AuthService authService;

    public record LoginRequest(String email, String password) {
    }

    public record RegisterRequest(String email, String password) {
    }

    public record TokenResponse(String token) {
    }

    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    @POST
    @Path("/register")
    public Response register(RegisterRequest req) {
        authService.register(req.email(), req.password());
        return Response.status(201).build();
    }

    @Produces(MediaType.APPLICATION_JSON)
    @Consumes(MediaType.APPLICATION_JSON)
    @POST
    @Path("/login")
    public Response login(LoginRequest req) {
        String token = authService.login(req.email(), req.password());
        return Response.ok(new TokenResponse(token)).build();
    }
}
