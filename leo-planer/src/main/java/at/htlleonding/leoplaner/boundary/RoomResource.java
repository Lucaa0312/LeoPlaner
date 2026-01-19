package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.Subject;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriBuilder;
import jakarta.ws.rs.core.UriInfo;

@Path("api/rooms")
public class RoomResource {
    @Inject
    DataRepository dataRepository;
    @Context
    UriInfo uriInfo;


    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllRooms() {
        List<Room> rooms = dataRepository.getAllRooms();
        return Response.status(Response.Status.OK).entity(rooms).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.MEDIA_TYPE_WILDCARD)
    public Response addRoom(Room room) {
        Room roomCreated = this.dataRepository.addRoom(room); // TODO add Error handling

        UriBuilder uriBuilder = this.uriInfo.getAbsolutePathBuilder();
        uriBuilder.path(Long.toString(roomCreated.getId()));

        return Response.created(uriBuilder.build()).build();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Path("/getRoomCount")
    public Response getRoomCount() {
        Long roomCount = this.dataRepository.getRoomCount();
        return Response.status(Response.Status.OK).entity(roomCount).build();
    }
}


