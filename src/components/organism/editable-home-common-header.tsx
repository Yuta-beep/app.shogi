import type { ComponentProps } from 'react';

import { EditDisplayNameModal } from '@/components/organism/edit-display-name-modal';
import { HomeCommonHeader } from '@/components/organism/home-common-header';
import { useEditDisplayName } from '@/hooks/common/use-edit-display-name';

type EditableHomeCommonHeaderProps = ComponentProps<typeof HomeCommonHeader>;

export function EditableHomeCommonHeader(props: EditableHomeCommonHeaderProps) {
  const edit = useEditDisplayName(props.userName);

  return (
    <>
      <HomeCommonHeader {...props} onUserNamePress={edit.open} />
      <EditDisplayNameModal
        visible={edit.visible}
        value={edit.draft}
        onChangeValue={edit.setDraft}
        onClose={edit.close}
        onSubmit={() => {
          void edit.submit();
        }}
        isSubmitting={edit.isSubmitting}
        error={edit.error}
      />
    </>
  );
}
