package com.cratechnologie.baaraboloda.web.rest.util;

import java.lang.annotation.*;

/** Resolve a public UUID to its internal ID, accepting legacy numeric links. */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface PublicId {
    String entity();

    String name();
}
