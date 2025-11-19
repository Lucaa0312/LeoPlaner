package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.ClassSubject;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;

@Path("api/classSubjects")
public class Resource {
  @Context
  UriInfo uriInfo;
  @Inject
  DataRepository dataRepository;

  @GET
  @Produces(MediaType.APPLICATION_JSON)
  public Response getAllClassSubjects() {
    List<ClassSubject> classSubjects = dataRepository.getAllClassSubjects();
    return Response.status(Response.Status.OK).entity(classSubjects).build();
  }
}
