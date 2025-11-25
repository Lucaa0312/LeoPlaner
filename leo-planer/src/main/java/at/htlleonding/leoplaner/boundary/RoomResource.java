package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Room;
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
import org.jboss.logging.Logger;

@Path("api/rooms")
public class RoomResource {
    private static final Logger LOG = Logger.getLogger(RoomResource.class);

    @Inject
    DataRepository dataRepository;
    @Context
    UriInfo uriInfo;


    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllRooms() {
        String endpoint = "GET /api/rooms";
        String requestUri = uriInfo.getRequestUri().toString();
        LOG.infof("[ENDPOINT: %s] [URI: %s] Request received - Fetching all rooms", endpoint, requestUri);
        
        try {
            List<Room> rooms = dataRepository.getAllRooms();
            LOG.infof("[ENDPOINT: %s] [STATUS: 200 OK] Successfully retrieved %d rooms", endpoint, rooms.size());
            return Response.status(Response.Status.OK).entity(rooms).build();
        } catch (Exception e) {
            LOG.errorf(e, "[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Error occurred while fetching all rooms - Exception: %s", endpoint, e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.MEDIA_TYPE_WILDCARD)
    public Response addRoom(Room room) {
        String endpoint = "POST /api/rooms";
        String requestUri = uriInfo.getRequestUri().toString();
        
        if (room == null) {
            LOG.warnf("[ENDPOINT: %s] [URI: %s] [STATUS: 400 BAD_REQUEST] Request received with null room payload", endpoint, requestUri);
            return Response.status(Response.Status.BAD_REQUEST).build();
        }

        LOG.infof("[ENDPOINT: %s] [URI: %s] Request received - Adding new room", endpoint, requestUri);
        
        try {
            Room roomCreated = this.dataRepository.addRoom(room);

            if (roomCreated == null) {
                LOG.warnf("[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Failed to create room - repository returned null", endpoint);
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
            }

            UriBuilder uriBuilder = this.uriInfo.getAbsolutePathBuilder();
            uriBuilder.path(Long.toString(roomCreated.getId()));
            String createdUri = uriBuilder.build().toString();

            LOG.infof("[ENDPOINT: %s] [STATUS: 201 CREATED] Successfully created room - ID: %d, Location: %s", endpoint, roomCreated.getId(), createdUri);
            return Response.created(uriBuilder.build()).build();
        } catch (Exception e) {
            LOG.errorf(e, "[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Error occurred while adding room - Exception: %s", endpoint, e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }
}


