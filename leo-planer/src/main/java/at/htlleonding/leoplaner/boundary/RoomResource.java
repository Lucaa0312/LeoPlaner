package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.dto.RoomDTO;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
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
        try {
            List<RoomDTO> rooms = dataRepository.getAllRooms()
                    .stream()
                    .map(UtilBuildFunctions::createRoomDTO)
                    .toList();

            return Response.ok(rooms).build();

        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Failed to fetch rooms")
                    .build();
        }
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response addRoom(Room room) {
        try {
            Room roomCreated = this.dataRepository.addRoom(room);

            if (roomCreated == null || roomCreated.getId() == null) {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity("Failed to create room")
                        .build();
            }

            UriBuilder uriBuilder = this.uriInfo.getAbsolutePathBuilder();
            uriBuilder.path(Long.toString(roomCreated.getId()));

            return Response.created(uriBuilder.build())
                    .entity(roomCreated)
                    .build();

        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(e.getMessage())
                    .build();
        }
    }

    @GET
    @Path("/getRoomCount")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getRoomCount() {
        try {
            Long roomCount = this.dataRepository.getRoomCount();

            return Response.ok(roomCount).build();

        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Failed to fetch room count")
                    .build();
        }
    }

    // TODO maybe refactor route to just /id
    @PUT
    @Path("update/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateRoom(@PathParam("id") Long id, Room room) {
        try {
            Room updatedRoom = dataRepository.updateRoom(id, room);

            if (updatedRoom == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Room not found")
                        .build();
            }

            return Response.ok(updatedRoom).build();

        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(e.getMessage())
                    .build();
        }
    }

    @DELETE
    @Path("delete/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response deleteRoom(@PathParam("id") Long id) {
        try {
            Room roomToDelete = dataRepository.deleteRoom(id);

            if (roomToDelete == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Room not found")
                        .build();
            }

            return Response.ok(roomToDelete).build();

        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Failed to delete room")
                    .build();
        }
    }
}