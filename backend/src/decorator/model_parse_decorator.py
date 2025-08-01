from functools import wraps
import torch.nn as nn

def residual_block(fusion_type: str = "add"):
    """
    装饰器：将模块标记为残差块，并设置融合类型
    :param fusion_type: 残差连接的融合方式（如"add"或"concat"）
    """
    def decorator(cls):
        # 确保被装饰类继承自nn.Module
        if not issubclass(cls, nn.Module):
            raise TypeError("残差块装饰器仅支持nn.Module子类")

        # 保存原始__init__方法
        original_init = cls.__init__

        # 重写__init__方法以注入残差属性
        @wraps(original_init)
        def new_init(self, *args, **kwargs):
            original_init(self, *args, **kwargs)
            self.residual = True          # 标记为残差块
            self.fusion_type = fusion_type  # 设置融合方式

        # 替换类的__init__方法
        cls.__init__ = new_init
        return cls
    return decorator