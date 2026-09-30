package com.cratechnologie.baaraboloda.service.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.cratechnologie.baaraboloda.web.rest.TestUtil;
import org.junit.jupiter.api.Test;

class SprintDTOTest {

    @Test
    void dtoEqualsVerifier() throws Exception {
        TestUtil.equalsVerifier(SprintDTO.class);
        SprintDTO sprintDTO1 = new SprintDTO();
        sprintDTO1.setId(1L);
        SprintDTO sprintDTO2 = new SprintDTO();
        assertThat(sprintDTO1).isNotEqualTo(sprintDTO2);
        sprintDTO2.setId(sprintDTO1.getId());
        assertThat(sprintDTO1).isEqualTo(sprintDTO2);
        sprintDTO2.setId(2L);
        assertThat(sprintDTO1).isNotEqualTo(sprintDTO2);
        sprintDTO1.setId(null);
        assertThat(sprintDTO1).isNotEqualTo(sprintDTO2);
    }
}
