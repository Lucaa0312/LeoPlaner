package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.TeacherWishProfile;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor;

import jakarta.inject.Inject;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("api/wishes")
public class WishResource {
    @Inject
    TeacherWishExtractor teacherWishExtractor;

    @Inject
    DataRepository dataRepository;

    /**
     * Reads every changed wish text now instead of on the next generation,
     * which with a real model can take minutes. The result is also what the
     * next algorithm start prices.
     */
    @POST
    @Path("extract")
    @Produces(MediaType.APPLICATION_JSON)
    public Response extract() {
        try {
            List<TeacherWishProfile> profiles = teacherWishExtractor.extractAll();
            dataRepository.getTimetableService().setTeacherWishProfiles(profiles);
            return Response.ok(profiles).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Wish extraction failed: " + e.getMessage())
                    .build();
        }
    }
}
