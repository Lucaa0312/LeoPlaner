package at.htlleonding.leoplaner.boundary;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.dto.AdminFeaturesDTO;
import jakarta.inject.Inject;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

// Destructive admin actions. Enabled in dev, disabled in prod (see application.properties);
// on the cloud they can be switched on temporarily with LEOPLANER_RESET_ENABLED / LEOPLANER_DEMO_DATA_ENABLED.
@Path("api/admin")
public class AdminResource {
    @Inject
    DataRepository dataRepository;

    @ConfigProperty(name = "leoplaner.reset-enabled")
    boolean resetEnabled;

    @ConfigProperty(name = "leoplaner.demo-data-enabled")
    boolean demoDataEnabled;

    @GET
    @Path("features")
    @Produces(MediaType.APPLICATION_JSON)
    public AdminFeaturesDTO getFeatures() {
        return new AdminFeaturesDTO(resetEnabled, demoDataEnabled);
    }

    @DELETE
    @Path("data")
    @Produces(MediaType.TEXT_PLAIN)
    public Response resetData() {
        if (!resetEnabled) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Reset is disabled")
                    .build();
        }

        if (dataRepository.getAlgorithmRunning()) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("The algorithm is running, stop it before resetting")
                    .build();
        }

        dataRepository.deleteAllData();
        return Response.noContent().build();
    }

    @POST
    @Path("demo-data")
    @Produces(MediaType.TEXT_PLAIN)
    public Response loadDemoData() {
        if (!demoDataEnabled) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity("Loading demo data is disabled")
                    .build();
        }

        if (dataRepository.hasSchoolData()) {
            return Response.status(Response.Status.CONFLICT)
                    .entity("Data already exists, reset first")
                    .build();
        }

        dataRepository.loadDemoData();
        return Response.noContent().build();
    }
}
