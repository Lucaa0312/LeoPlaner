package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.SchoolClass;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@Transactional
public class TestClassSubjectInstance {
    @Inject
    EntityManager entityManager;

    
}
