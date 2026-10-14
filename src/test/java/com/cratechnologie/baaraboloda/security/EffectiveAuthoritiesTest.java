package com.cratechnologie.baaraboloda.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.cratechnologie.baaraboloda.domain.Authority;
import com.cratechnologie.baaraboloda.domain.User;
import java.lang.reflect.Field;
import org.junit.jupiter.api.Test;

class EffectiveAuthoritiesTest {

    @Test
    void handlesLegacyUsersWhosePermissionOverridesAreNull() throws Exception {
        User user = new User();
        user.getAuthorities().add(new Authority().name(AuthoritiesConstants.USER));
        setField(user, "grantedPermissions", null);
        setField(user, "revokedPermissions", null);

        assertThat(EffectiveAuthorities.of(user)).containsExactly(AuthoritiesConstants.USER);
    }

    private void setField(User user, String name, Object value) throws Exception {
        Field field = User.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(user, value);
    }
}
