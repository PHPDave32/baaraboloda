package com.cratechnologie.baaraboloda.security;

/**
 * Constants for Spring Security authorities.
 */
public final class AuthoritiesConstants {

    public static final String ADMIN = "ROLE_ADMIN";

    public static final String USER = "ROLE_USER";

    public static final String ANONYMOUS = "ROLE_ANONYMOUS";

    public static final String PERM_PROJECT_CREATE = "PERM_PROJECT_CREATE";

    public static final String PERM_PROJECT_DELETE = "PERM_PROJECT_DELETE";

    public static final String PERM_SPRINT_MANAGE = "PERM_SPRINT_MANAGE";

    public static final String PERM_MANAGE_MEMBERS = "PERM_MANAGE_MEMBERS";

    private AuthoritiesConstants() {}
}
