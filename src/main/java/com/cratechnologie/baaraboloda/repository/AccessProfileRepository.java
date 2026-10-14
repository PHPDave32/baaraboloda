package com.cratechnologie.baaraboloda.repository;

import com.cratechnologie.baaraboloda.domain.AccessProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccessProfileRepository extends JpaRepository<AccessProfile, Long> {
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
