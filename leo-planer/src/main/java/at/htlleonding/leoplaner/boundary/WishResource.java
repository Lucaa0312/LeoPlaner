package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.TeacherWishProfile;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
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

    /**
     * The same in the background, for a model that takes half an hour: answers
     * at once with the progress, also when an extraction is already running.
     */
    @POST
    @Path("extract/start")
    @Produces(MediaType.APPLICATION_JSON)
    public Response startExtraction() {
        if (!teacherWishExtractor.progress().running()) {
            // read here, the worker thread has no transaction
            final TeacherWishExtractor.Snapshot snapshot = teacherWishExtractor.snapshot();
            final Thread worker = new Thread(() -> {
                try {
                    dataRepository.getTimetableService()
                            .setTeacherWishProfiles(teacherWishExtractor.extract(snapshot));
                } catch (RuntimeException e) {
                    System.out.println("Wish extraction failed: " + e.getMessage());
                }
            }, "wish-extraction");
            worker.setDaemon(true);
            worker.start();
            // the worker may not have counted its first text yet
            return Response.accepted(new TeacherWishExtractor.Progress(true, 0, snapshot.inputs().size(), null))
                    .build();
        }
        return Response.accepted(teacherWishExtractor.progress()).build();
    }

    @GET
    @Path("extract/status")
    @Produces(MediaType.APPLICATION_JSON)
    public Response extractionStatus() {
        return Response.ok(teacherWishExtractor.progress()).build();
    }

    /**
     * Each wish text next to what was made of it, for a human to check. Never
     * asks the model.
     */
    @GET
    @Path("review")
    @Produces(MediaType.APPLICATION_JSON)
    public Response review() {
        return Response.ok(teacherWishExtractor.review(teacherWishExtractor.snapshot())).build();
    }

    /**
     * Stores a human's version of one text's wishes. It is kept across model
     * and prompt changes and goes into the next run as it is.
     */
    @PUT
    @Path("review/{textHash}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response saveReview(@PathParam("textHash") final String textHash,
            final TeacherWishExtractor.Answer answer) {
        if (answer == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity("wishes and unmappable expected").build();
        }
        teacherWishExtractor.saveReview(textHash, answer);
        // the next algorithm start reads the profiles again
        dataRepository.getTimetableService().setTeacherWishProfiles(null);
        return Response.noContent().build();
    }

    /** Drops one text's answer, so the next extraction asks the model again. */
    @DELETE
    @Path("review/{textHash}")
    public Response forgetReview(@PathParam("textHash") final String textHash) {
        teacherWishExtractor.forget(textHash);
        dataRepository.getTimetableService().setTeacherWishProfiles(null);
        return Response.noContent().build();
    }
}
