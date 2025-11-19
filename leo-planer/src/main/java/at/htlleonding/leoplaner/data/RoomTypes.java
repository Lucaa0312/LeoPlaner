package at.htlleonding.leoplaner.data;

import jakarta.persistence.Embeddable;

@Embeddable
public enum RoomTypes { // TODO remove from database and per Room-RequiredRoomtypes
                        // Subject-requiredRoomtyped table just add in plain text and convert in program
  EDV,
  CHEM,
  PHY,
  SPORT,
  WORKSHOP
}
