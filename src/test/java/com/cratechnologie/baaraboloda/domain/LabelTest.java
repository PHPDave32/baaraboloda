package com.cratechnologie.baaraboloda.domain;

import static com.cratechnologie.baaraboloda.domain.LabelTestSamples.*;
import static com.cratechnologie.baaraboloda.domain.ProjectTestSamples.*;
import static org.assertj.core.api.Assertions.assertThat;

import com.cratechnologie.baaraboloda.web.rest.TestUtil;
import org.junit.jupiter.api.Test;

class LabelTest {

    @Test
    void equalsVerifier() throws Exception {
        TestUtil.equalsVerifier(Label.class);
        Label label1 = getLabelSample1();
        Label label2 = new Label();
        assertThat(label1).isNotEqualTo(label2);

        label2.setId(label1.getId());
        assertThat(label1).isEqualTo(label2);

        label2 = getLabelSample2();
        assertThat(label1).isNotEqualTo(label2);
    }

    @Test
    void projectTest() {
        Label label = getLabelRandomSampleGenerator();
        Project projectBack = getProjectRandomSampleGenerator();

        label.setProject(projectBack);
        assertThat(label.getProject()).isEqualTo(projectBack);

        label.project(null);
        assertThat(label.getProject()).isNull();
    }
}
