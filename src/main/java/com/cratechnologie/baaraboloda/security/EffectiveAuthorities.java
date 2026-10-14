package com.cratechnologie.baaraboloda.security;

import com.cratechnologie.baaraboloda.domain.User;
import java.util.HashSet;
import java.util.Set;

public final class EffectiveAuthorities {

    private EffectiveAuthorities() {}

    public static Set<String> of(User user) {
        Set<String> result = new HashSet<>();
        user.getAuthorities().forEach(a -> result.add(a.getName()));
        if (user.getAccessProfile() != null) {
            boolean superAdmin = result.contains(AuthoritiesConstants.SUPER_ADMIN);
            result.clear();
            result.add(AuthoritiesConstants.USER);
            if (superAdmin) result.add(AuthoritiesConstants.SUPER_ADMIN);
            result.addAll(user.getAccessProfile().getPermissions());
            if (user.getAccessProfile().isAllProjects()) result.add("PERM_PROJECT_VIEW_ALL");
        }
        if (user.getGrantedPermissions() != null) result.addAll(user.getGrantedPermissions());
        if (user.getRevokedPermissions() != null) result.removeAll(user.getRevokedPermissions());
        return result;
    }
}
