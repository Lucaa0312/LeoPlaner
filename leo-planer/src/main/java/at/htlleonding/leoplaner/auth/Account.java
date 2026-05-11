package at.htlleonding.leoplaner.auth;

import java.time.OffsetDateTime;
import java.util.Optional;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "accounts")
public class Account extends PanacheEntity {
    @Column(unique = true, nullable = false)
    public String email;

    @Column(name = "password_hash")
    public String passwordHash;

    @Column(name = "created_at")
    public OffsetDateTime createdAt = OffsetDateTime.now();

    public static Optional<Account> findByEmail(String email) {
        return find("email", email.toLowerCase()).firstResultOptional();
    }
}
