package at.htlleonding.leoplaner.auth;

import java.time.Duration;

import at.favre.lib.crypto.bcrypt.BCrypt;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;

@ApplicationScoped
public class AuthService {
    @Transactional
    public Account register(String email, String rawPassword) {
        if (Account.findByEmail(email).isPresent()) {
            throw new WebApplicationException("Email already in use", 409);
        }
        Account account = new Account();
        account.email = email.toLowerCase();
        account.passwordHash = hash(rawPassword);
        account.persist();
        return account;
    }

    public String login(String email, String rawPassword) {
        Account account = Account.findByEmail(email)
                .orElseThrow(() -> new WebApplicationException("Invalid credentials", 401));

        if (account.passwordHash == null ||
                !BCrypt.verifyer().verify(rawPassword.toCharArray(), account.passwordHash).verified) {
            throw new WebApplicationException("Invalid credentials", 401);
        }
        return issueToken(account);
    }

    private String hash(String raw) {
        return BCrypt.withDefaults().hashToString(12, raw.toCharArray());
    }

    private String issueToken(Account account) {
        return Jwt.issuer("leoplaner")
                .subject(account.id.toString())
                .claim("email", account.email)
                .expiresIn(Duration.ofHours(8))
                .sign();
    }
}
