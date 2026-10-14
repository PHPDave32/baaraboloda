package com.cratechnologie.baaraboloda.web.rest;

import com.cratechnologie.baaraboloda.domain.AccessProfile;
import com.cratechnologie.baaraboloda.security.PermissionCatalog;
import com.cratechnologie.baaraboloda.service.AccessProfileService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/access-profiles")
public class AccessProfileResource {

    private final AccessProfileService profiles;

    public AccessProfileResource(AccessProfileService profiles) {
        this.profiles = profiles;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'PERM_USER_MANAGE')")
    public List<AccessProfile> list() {
        return profiles.list();
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public List<PermissionCatalog.Permission> permissions() {
        return PermissionCatalog.ALL;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<AccessProfile> create(@Valid @RequestBody AccessProfile input) {
        return ResponseEntity.status(201).body(profiles.save(null, input));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public AccessProfile update(@PathVariable Long id, @Valid @RequestBody AccessProfile input) {
        return profiles.save(id, input);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        profiles.delete(id);
        return ResponseEntity.noContent().build();
    }
}
