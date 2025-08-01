from collections import OrderedDict
import tomllib
from torch import nn

class ModelParser:
    def __init__(self, config_path) -> None:
        with open(config_path, "rb") as f:
            config = tomllib.load(f)
            self.attributes_keep = config["attributes"]["keep"]

    def __call__(self, model, **kwds) -> OrderedDict:
        if not isinstance(model, nn.Module):
            raise TypeError("解析器仅支持torch.nn.Module子类")

        return self._parse_layers(model)

    def _get_layer_attributes(self, layer) -> OrderedDict:
        """提取模块的关键属性"""
        attrs = OrderedDict()
        for attr in self.attributes_keep:
            if hasattr(layer, attr):
                attrs[attr] = getattr(layer, attr)
        return attrs
    
    def _get_layer_info(self, layer, name: str = "root") -> OrderedDict:
        info = OrderedDict()
        info["layer_name"] = name
        info["layer_type"] = layer.__class__.__name__
        
        # 记录参数和基础属性（与之前相同）
        info["parameters"] = {k: list(v.shape) for k, v in layer.named_parameters(recurse=False)}
        info["attributes"] = self._get_layer_attributes(layer)
        return info
    
    def _parse_residual_layer(self, layer, parent_input=None) -> OrderedDict:
        """ 
        处理残差连接特殊标记
        假设我们在自定义残差块中添加了'residual'属性用于标识
        """
        info = OrderedDict()
        info["is_residual_block"] = True
        # 记录跳跃连接的输入来源和融合方式
        info["residual_connection"] = {
            "input_source": parent_input or "block_input",  # 输入来源（如前一层或模块输入）
            "fusion_type": layer.fusion_type if hasattr(layer, 'fusion_type') else "add",  # 融合方式（加法、卷积调整等）
            "adjust_layer": None  # 若有维度调整层（如1x1卷积），记录其信息
        }

        # 解析残差块内部的主分支和调整层
        main_branch = []
        adjust_layer = None
        for child_name, child_module in layer.named_children():
            if child_name == "adjust":  # 假设调整层命名为'adjust'
                adjust_layer = self._get_layer_info(child_module, child_name)
                info["residual_connection"]["adjust_layer"] = adjust_layer
            else:  # 主分支层
                main_branch.append(self._get_layer_info(child_module, child_name))
        info["children"] = main_branch

        return info
    
    def _parse_layers(self, layer, name: str = "root", parent_input=None) -> OrderedDict:
        """
        递归解析模块结构，支持残差连接表示
        parent_input: 记录当前模块的输入来源（用于标记残差连接）
        """
        info = self._get_layer_info(layer, name)
        
        # 处理残差连接特殊标记
        # 假设我们在自定义残差块中添加了'residual'属性用于标识
        if hasattr(layer, 'residual') and layer.residual:
            info["is_residual_block"] = True
            # 记录跳跃连接的输入来源和融合方式
            info["residual_connection"] = {
                "input_source": parent_input or "block_input",  # 输入来源（如前一层或模块输入）
                "fusion_type": layer.fusion_type if hasattr(layer, 'fusion_type') else "add",  # 融合方式（加法、卷积调整等）
                "adjust_layer": None  # 若有维度调整层（如1x1卷积），记录其信息
            }
            # 解析残差块内部的主分支和调整层
            main_branch = []
            adjust_layer = None
            for child_name, child_module in layer.named_children():
                if child_name == "adjust":  # 假设调整层命名为'adjust'
                    adjust_layer = self._parse_layers(child_module, child_name, parent_input=parent_input)
                    info["residual_connection"]["adjust_layer"] = adjust_layer
                else:  # 主分支层
                    main_branch.append(self._parse_layers(child_module, child_name, parent_input=name))
                    # main_branch.append(self._get_layer_info(child_module, child_name, parent_input=name))
            info["children"] = main_branch
        else:
            # 普通模块：递归解析子模块，输入来源为当前模块名称
            info["children"] = [
                self._parse_layers(child, child_name, parent_input=name)
                for child_name, child in layer.named_children()
            ]
            info["is_residual_block"] = False
            info["residual_connection"] = None  # 非残差块无此属性
            
        return info