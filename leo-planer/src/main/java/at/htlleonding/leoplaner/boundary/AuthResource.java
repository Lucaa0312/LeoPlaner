package at.htlleonding.leoplaner.boundary;

import at.htlleonding.leoplaner.data.User;
import at.htlleonding.leoplaner.dto.AuthRequest;
import at.htlleonding.leoplaner.dto.MessageResponse;
import at.htlleonding.leoplaner.dto.UserResponse;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @POST
    @Path("/register")
    @Transactional
    public Response register(AuthRequest req) {
        if (User.findByUsername(req.username) != null) {
            return Response.status(Response.Status.CONFLICT)
                    .entity(new MessageResponse("Username already taken"))
                    .build();
        }

        User user = new User();
        user.username     = req.username;
        user.email        = req.email;
        user.passwordHash = req.password; // plain text for now, Keycloak will replace this
        user.persist();

        return Response.status(Response.Status.CREATED)
                .entity(new UserResponse(user.username, user.email))
                .build();
    }

    @POST
    @Path("/login")
    public Response login(AuthRequest req) {
        User user = User.findByUsername(req.username);

        if (user == null || !user.passwordHash.equals(req.password)) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(new MessageResponse("Invalid credentials"))
                    .build();
        }

        return Response.ok(new UserResponse(user.username, user.email)).build();
    }

}