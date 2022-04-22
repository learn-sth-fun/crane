import clsx from 'clsx';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Alert, Button, Dialog, Form, Input, Tabs } from 'tdesign-react';

import { clusterApi } from '../../apis/clusterApi';
import { useSelector } from '../../hooks';
import { editClusterActions } from '../../store/editClusterSlice';
import { getErrorMsg } from '../../utils/getErrorMsg';

type Validation = { error: boolean; msg: string };

export const EditClusterModal = React.memo(() => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const editingClusterId = useSelector(state => state.editCluster.editingClusterId);
  const mode = useSelector(state => state.editCluster.mode);
  const visible = useSelector(state => state.editCluster.modalVisible);
  const clusters = useSelector(state => state.editCluster.clusters);

  const [validation, setValidation] = React.useState<
    Record<string, { clusterId: Validation; clusterName: Validation; craneUrl: Validation }>
  >({});

  const handleClose = () => {
    dispatch(editClusterActions.modalVisible(false));
    dispatch(editClusterActions.resetCluster());
  };

  const [addClustersMutation, addClusterMutationOptions] = clusterApi.useAddClustersMutation();
  const [updateClusterMutation, updateClusterMutationOptions] = clusterApi.useUpdateClusterMutation();

  React.useEffect(() => {
    return () => {
      dispatch(editClusterActions.resetCluster());
    };
  }, [dispatch]);

  React.useEffect(() => {
    if (!visible) {
      dispatch(editClusterActions.resetCluster());
    }
  }, [dispatch, visible]);

  React.useEffect(() => {
    if (addClusterMutationOptions.isSuccess && mode === 'create') {
      dispatch(editClusterActions.resetCluster());
      dispatch(editClusterActions.modalVisible(false));
    }
  }, [addClusterMutationOptions.isSuccess, dispatch, mode]);

  React.useEffect(() => {
    if (updateClusterMutationOptions.isSuccess && mode === 'update') {
      dispatch(editClusterActions.resetCluster());
      dispatch(editClusterActions.modalVisible(false));
    }
  }, [dispatch, mode, updateClusterMutationOptions.isSuccess]);

  const validateClusterName = (id: string) => {
    const res = { error: !clusters.find(cluster => cluster.id === id)?.clusterName, msg: t('集群名称不能为空') };
    setValidation(validation => ({
      ...validation,
      [id]: {
        ...validation[id],
        clusterName: res
      }
    }));
    return res;
  };

  const validateCraneUrl = (id: string) => {
    const res = { error: false, msg: '' };
    const cluster = clusters.find(cluster => cluster.id === id);

    if (!cluster?.craneUrl) {
      res.error = true;
      res.msg = t('Crane URL不能为空');
    } else if (!cluster.craneUrl.startsWith('http://') && !cluster.craneUrl.startsWith('https://')) {
      res.error = true;
      res.msg = t('Crane URL格式不正确，请输入正确的URL');
    } else if (cluster.craneUrl.endsWith('/')) {
      res.error = true;
      res.msg = t('请移除末尾的 /，否则会导致成本洞察中 Grafana 404')
    }

    setValidation(validation => ({
      ...validation,
      [id]: {
        ...validation[id],
        craneUrl: res
      }
    }));

    return res;
  };

  const renderErrorContent = () => {
    if (mode === 'create') {
      return (
        addClusterMutationOptions.isError && (
          <Alert
            message={getErrorMsg(addClusterMutationOptions.error)}
            style={{ marginBottom: 0, marginTop: '1rem' }}
            theme="error"
          />
        )
      );
    } else if (mode === 'update') {
      return (
        updateClusterMutationOptions.isError && (
          <Alert
            message={getErrorMsg(updateClusterMutationOptions.error)}
            style={{ marginBottom: 0, marginTop: '1rem' }}
            theme="error"
          />
        )
      );
    } else return null;
  };

  const isLoading =
    mode === 'create'
      ? addClusterMutationOptions.isLoading
      : mode === 'update'
      ? updateClusterMutationOptions.isLoading
      : false;

  const handleSubmit = () => {
    let error = false;
    let firstErrorClusterId = null;

    for (const cluster of clusters) {
      const clusterNameRes = validateClusterName(cluster.id);
      const craneUrlRes = validateCraneUrl(cluster.id);

      error = error || clusterNameRes.error || craneUrlRes.error;

      if (error && !firstErrorClusterId) {
        firstErrorClusterId = cluster.id;
      }
    }

    if (error) {
      dispatch(editClusterActions.editingClusterId(firstErrorClusterId));
    } else if (mode === 'create') {
      addClustersMutation({
        data: {
          clusters: (clusters ?? []).map(cluster => {
            return {
              name: cluster.clusterName,
              craneUrl: cluster.craneUrl
            };
          })
        }
      });
    } else if (mode === 'update') {
      updateClusterMutation({
        data: {
          id: clusters[0].id,
          name: clusters[0].clusterName,
          craneUrl: clusters[0].craneUrl
        }
      });
    }
  };

  return (
    <Dialog
      footer={
        <>
          <Button
            theme="default"
            onClick={() => {
              handleClose();
            }}
          >
            {t('取消')}
          </Button>
          <Button
            loading={isLoading}
            onClick={() => {
              handleSubmit();
            }}
          >
            {t('确定')}
          </Button>
        </>
      }
      header={mode === 'create' ? t('添加集群') : t('更新集群')}
      visible={visible}
      width="50%"
      onClose={() => {
        handleClose();
      }}
    >
      <div style={{ marginBottom: 10 }}>{t('请输入一个可访问的CRANE Endpoint，以获得新集群的相关成本数据')}</div>
      <Form >
        <Tabs
          addable={mode === 'create'}
          style={{ border: '1px solid var(--td-component-stroke)' }}
          theme="card"
          value={editingClusterId}
          onAdd={
            mode === 'create'
              ? () => {
                  dispatch(editClusterActions.addCluster());
                }
              : null
          }
          onChange={(tabId: string) => {
            dispatch(editClusterActions.editingClusterId(tabId));
          }}
          onRemove={option => {
            dispatch(editClusterActions.deleteCluster({ id: option.value + '' }));
          }}
        >
          {clusters.map((cluster, index) => {
            return (
              <Tabs.TabPanel
                destroyOnHide={false}
                key={cluster.id}
                label={t('集群') + (index + 1)}
                removable={mode === 'create' ? clusters.length !== 1 : false}
                value={cluster.id}
              >
                <div style={{ padding: '24px' }}>
                  <Form.FormItem
                    className={clsx({ isError: validation[cluster.id]?.clusterName?.error })}
                    help={
                      (
                        <span style={{ color: 'var(--td-error-color)' }}>
                          {validation[cluster.id]?.clusterName?.error ? validation[cluster.id]?.clusterName?.msg : null}
                        </span>
                      ) as any
                    }
                    initialData={cluster.clusterName}
                    label={t('集群名称')}
                    name={`clusters[${index}].clusterName`}
                    requiredMark
                  >
                    <Input
                      value={cluster.clusterName}
                      onBlur={() => {
                        validateClusterName(cluster.id);
                      }}
                      onChange={(clusterName: string) => {
                        dispatch(
                          editClusterActions.updateCluster({
                            id: cluster.id,
                            data: { clusterName }
                          })
                        );
                      }}
                    />
                  </Form.FormItem>
                  <Form.FormItem
                    className={clsx({ isError: validation[cluster.id]?.craneUrl?.error })}
                    help={
                      (
                        <span style={{ color: 'var(--td-error-color)' }}>
                          {validation[cluster.id]?.craneUrl?.error ? validation[cluster.id]?.craneUrl?.msg : null}
                        </span>
                      ) as any
                    }
                    initialData={cluster.craneUrl}
                    label={t('CRANE URL')}
                    name={`clusters[${index}].craneUrl`}
                  >
                    <Input
                      value={cluster.craneUrl}
                      onBlur={() => {
                        validateCraneUrl(cluster.id);
                      }}
                      onChange={(craneUrl: string) => {
                        dispatch(
                          editClusterActions.updateCluster({
                            id: cluster.id,
                            data: { craneUrl }
                          })
                        );
                      }}
                    />
                  </Form.FormItem>
                </div>
              </Tabs.TabPanel>
            );
          })}
        </Tabs>
      </Form>
      {renderErrorContent()}
    </Dialog>
  );
});
