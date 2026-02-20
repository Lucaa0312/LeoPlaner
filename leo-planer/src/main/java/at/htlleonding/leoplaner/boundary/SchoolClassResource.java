package at.htlleonding.leoplaner.boundary;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.dto.SchoolClassDTO;
import jakarta.inject.Inject;

@Path("api")
public class SchoolClassResource {
    @Inject
    DataRepository dataRepository;

    @Path("getAllClasses")
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<SchoolClassDTO> getAllClasses() {
        return UtilBuildFunctions.createListOfSchoolclassDTOs(this.dataRepository.getAllSchoolClasses());
    }
}
